export default {
  fetch(request) {
    return new Response("deshi gin Worker Live", {
      headers: {
        "content-type": "text/plain",
      },
    });
  },
};
