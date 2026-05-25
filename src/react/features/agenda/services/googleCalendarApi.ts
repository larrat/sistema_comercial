export const googleCalendarApi = {
  
  // Busca a lista de agendas que o usuário tem acesso (incluindo as compartilhadas)
  async getCalendarList(accessToken: string) {
    const res = await fetch(`https://www.googleapis.com/calendar/v3/users/me/calendarList`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      }
    });

    if (!res.ok) {
      throw new Error('Falha ao buscar lista de agendas');
    }

    return res.json();
  },

  async getEvents(accessToken: string, timeMin: string, timeMax: string, calendarId: string = 'primary') {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      }
    });

    if (!res.ok) {
      throw new Error('Falha ao buscar eventos do Google Calendar');
    }

    return res.json();
  },

  async createEvent(accessToken: string, eventData: any, calendarId: string = 'primary') {
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
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
