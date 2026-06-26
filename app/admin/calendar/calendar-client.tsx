"use client";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import resourceTimeGridPlugin from "@fullcalendar/resource-timegrid";
import interactionPlugin from "@fullcalendar/interaction";

type CalendarEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  staff_id: string;
};

type CalendarResource = {
  id: string;
  title: string;
};

export function CalendarClient() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [resources, setResources] = useState<CalendarResource[]>([]);

  useEffect(() => {
    fetch("/api/admin/bookings")
      .then((response) => response.json())
      .then((body) => {
        setEvents(body.bookings || []);
        setResources(body.resources || []);
      })
      .catch(() => {
        setEvents([]);
        setResources([]);
      });
  }, []);

  return (
    <div className="rounded-lg border bg-white p-4">
      <FullCalendar
        plugins={[resourceTimeGridPlugin, interactionPlugin]}
        initialView="resourceTimeGridDay"
        schedulerLicenseKey={process.env.NEXT_PUBLIC_FULLCALENDAR_SCHEDULER_LICENSE_KEY || "GPL-My-Project-Is-Open-Source"}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "resourceTimeGridDay,resourceTimeGridWeek"
        }}
        resources={resources}
        events={events.map((event) => ({
          id: event.id,
          title: event.title,
          start: event.starts_at,
          end: event.ends_at,
          resourceId: event.staff_id
        }))}
        slotMinTime="08:00:00"
        slotMaxTime="20:00:00"
        allDaySlot={false}
        height="auto"
      />
    </div>
  );
}
