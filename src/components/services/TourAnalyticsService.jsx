const TourAnalytics = {
  track(event, payload = {}) {
    try {
      // Lightweight tracker: extend later to persist in an entity if needed
      // Example: await TemplateAnalytics.track('tour_event', {event, ...payload})
      console.debug("[tour]", event, payload);
    } catch {
      // ignore
    }
  }
};
export default TourAnalytics;