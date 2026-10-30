import json
import logging
from typing import Dict, Any, List, Optional
import google.generativeai as genai
from app.core.config import get_settings

logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self):
        self.settings = get_settings()
        self.api_key = self.settings.GEMINI_API_KEY
        self.model = None

        if self.api_key and self.api_key != "your-gemini-api-key":
            try:
                genai.configure(api_key=self.api_key)
                # Try standard fast model
                self.model = genai.GenerativeModel("gemini-1.5-flash")
                logger.info("Gemini AI client initialized successfully.")
            except Exception as e:
                logger.warning(f"Could not initialize Gemini model: {e}")

    async def chat(self, user_message: str, context: Dict[str, Any], history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        """
        Interprets natural language logistics queries and provides actionable explanations.
        Context includes live vehicles, pending deliveries, active route plans, and stats.
        """
        # If Gemini is configured, use it
        if self.model:
            try:
                prompt = f"""
You are "SmartMove AI Assistant", an expert AI logistics and delivery optimization consultant.
You assist logistics managers in Chennai with vehicle routing, dispatching, delay management, and fleet efficiency.

LIVE SYSTEM CONTEXT:
- Total Vehicles: {context.get('total_vehicles', 0)} ({context.get('active_vehicles', 0)} on delivery, {context.get('available_vehicles', 0)} available)
- Pending Deliveries: {context.get('pending_deliveries', 0)}
- Active Route Plans: {context.get('active_plans', 0)}
- Vehicles Detail: {json.dumps(context.get('vehicles_sample', []), indent=2)}
- Deliveries Sample: {json.dumps(context.get('deliveries_sample', []), indent=2)}
- Current Metrics: Total Distance={context.get('total_distance_km', 0)} km, Fleet Utilization={context.get('fleet_utilization', 0)}%

USER QUERY:
"{user_message}"

INSTRUCTIONS:
1. Provide a direct, professional, logistics-focused response.
2. If the user wants to execute an action (e.g., optimize routes, redistribute broken vehicle, simulate road closure):
   - Clearly explain what action will be taken.
   - Mention the exact vehicles and deliveries impacted.
   - Tell the administrator that confirmation is required before modifying live route plans.
3. Suggest concrete savings (fuel, time, vehicle capacity utilization).
4. Return a friendly, concise, markdown-formatted response.
"""
                response = self.model.generate_content(prompt)
                if response and response.text:
                    intent = self._detect_intent(user_message)
                    return {
                        "response": response.text,
                        "intent": intent,
                        "requires_approval": intent in ["optimize", "breakdown", "reassign"],
                        "source": "gemini"
                    }
            except Exception as e:
                logger.warning(f"Gemini generation error: {e}. Falling back to intelligent rule engine.")

        # Intelligent Fallback Engine
        return self._rule_based_response(user_message, context)

    def _detect_intent(self, msg: str) -> str:
        m = msg.lower()
        if "optimize" in m or "generate route" in m or "best route" in m:
            return "optimize"
        if "breakdown" in m or "broken" in m or "redistribute" in m or "puncture" in m:
            return "breakdown"
        if "urgent" in m or "priority" in m:
            return "priority"
        if "workload" in m or "highest" in m or "busy" in m:
            return "workload"
        if "delay" in m or "late" in m:
            return "delay"
        if "reduce" in m or "fuel" in m or "save" in m or "distance" in m:
            return "efficiency"
        return "general"

    def _rule_based_response(self, user_message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Provides expert domain responses based on actual live data when API key is offline."""
        intent = self._detect_intent(user_message)
        pending = context.get('pending_deliveries', 0)
        vehicles = context.get('vehicles_sample', [])
        deliveries = context.get('deliveries_sample', [])

        if intent == "optimize":
            text = (
                f"### 🚚 Route Optimization Recommendation\n\n"
                f"Found **{pending} pending deliveries** across Chennai and **{len(vehicles)} available vehicles** in your fleet.\n\n"
                f"**Proposed Action:**\n"
                f"- Run OR-Tools multi-vehicle routing solver with **Balanced Optimization** mode.\n"
                f"- Distribute high-priority orders (e.g., T. Nagar, Mylapore) first.\n"
                f"- Estimated distance reduction: **15% to 22%** compared to sequential manual delivery.\n\n"
                f"> 💡 *Tip: Go to the **Optimization** tab and click **Generate Routes** to review the road geometry before approving.*"
            )
            return {"response": text, "intent": "optimize", "requires_approval": True, "source": "rule_engine"}

        elif intent == "breakdown":
            text = (
                f"### ⚠️ Vehicle Disruption Protocol\n\n"
                f"I detected a vehicle breakdown request. Here is the recommended recovery plan:\n\n"
                f"1. **Identify Affected Stops:** Isolate pending orders currently assigned to the disabled vehicle.\n"
                f"2. **Capacity Validation:** Reallocate remaining payload to active vehicles with spare capacity.\n"
                f"3. **OSRM Route Recalculation:** Compute updated road routes without exceeding driver duty time.\n\n"
                f"> 🛡️ *Safety Note: Use the **Scenarios** simulator to run a breakdown simulation and compare distance delta before committing changes.*"
            )
            return {"response": text, "intent": "breakdown", "requires_approval": True, "source": "rule_engine"}

        elif intent == "workload":
            if vehicles:
                top_v = max(vehicles, key=lambda v: v.get('max_capacity', 500))
                text = (
                    f"### 📊 Vehicle Workload Analysis\n\n"
                    f"- **Highest Capacity Carrier:** `{top_v.get('registration_number', 'TN 02 CD 2002')}` "
                    f"({top_v.get('vehicle_type', 'truck').capitalize()}, {top_v.get('max_capacity', 1200)} kg capacity).\n"
                    f"- **Fleet Status:** {context.get('active_vehicles', 0)} active, {context.get('available_vehicles', 0)} ready for dispatch.\n"
                    f"- Balanced distribution is recommended to avoid bottlenecking heavy vehicles."
                )
            else:
                text = "No active vehicles found in the fleet database. Please register vehicles to view workload statistics."
            return {"response": text, "intent": "workload", "requires_approval": False, "source": "rule_engine"}

        elif intent == "delay":
            urgent_delivs = [d for d in deliveries if d.get('priority') in ['urgent', 'high']]
            count = len(urgent_delivs)
            text = (
                f"### ⏱️ Delivery Delay Risk Assessment\n\n"
                f"- Currently tracking **{count} high-priority / urgent deliveries**.\n"
                f"- Orders in congested zones (e.g. Anna Salai, GST Road Guindy) should be dispatched during off-peak morning windows (09:00 - 11:30 AM).\n"
                f"- OSRM road geometry is configured to calculate real turn-by-turn road durations rather than straight lines."
            )
            return {"response": text, "intent": "delay", "requires_approval": False, "source": "rule_engine"}

        else:
            text = (
                f"### 🤖 SmartMove AI Logistics Assistant\n\n"
                f"I am actively monitoring your Chennai delivery network with **{pending} pending deliveries** "
                f"and **{len(vehicles)} fleet vehicles**.\n\n"
                f"**You can ask me to:**\n"
                f"- *'Optimize all pending deliveries'*\n"
                f"- *'Vehicle 1 has broken down. Redistribute its deliveries.'*\n"
                f"- *'Which vehicle has the highest workload?'*\n"
                f"- *'Show deliveries that may be delayed'* \n"
                f"- *'Suggest how to reduce total delivery distance'*"
            )
            return {"response": text, "intent": "general", "requires_approval": False, "source": "rule_engine"}

gemini_service = GeminiService()

