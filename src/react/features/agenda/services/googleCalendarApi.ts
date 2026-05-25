export const googleCalendarApi = {
  
  async getEvents(accessToken: string, timeMin: string, timeMax: string) {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      }
    });

    if (!res.ok) {
      throw new Error('Falha ao buscar eventos do Google Calendar');
    }

    return res.json();
  },

  async createEvent(accessToken: string, eventData: any) {
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    if (!res.ok) {
      throw new Error('Falha ao criar evento no Google Calendar');
    }

    return res.json();
  }
};
