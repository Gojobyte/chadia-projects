"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  color?: string;
}

interface ProjectCalendarProps {
  events?: CalendarEvent[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

export function ProjectCalendar({
  events = [],
  onDateClick,
  onEventClick,
}: ProjectCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startDayOfWeek = startOfMonth(currentMonth).getDay();

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = format(event.date, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    return map;
  }, [events]);

  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <div className="rounded-lg border bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {format(currentMonth, "MMMM yyyy", { locale: fr })}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 rounded hover:bg-muted text-sm"
          >
            ←
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-2 py-1 rounded hover:bg-muted text-xs font-medium"
          >
            Aujourd&apos;hui
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 rounded hover:bg-muted text-sm"
          >
            →
          </button>
        </div>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded overflow-hidden">
        {/* Empty cells for offset */}
        {Array.from({ length: startDayOfWeek === 0 ? 6 : startDayOfWeek - 1 }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-card min-h-[80px]" />
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDate.get(dateKey) || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <div
              key={dateKey}
              onClick={() => onDateClick?.(day)}
              className={cn(
                "bg-card min-h-[80px] p-1 cursor-pointer transition-colors hover:bg-muted/50",
                !isCurrentMonth && "opacity-40"
              )}
            >
              <div
                className={cn(
                  "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1",
                  isToday(day) && "bg-primary text-primary-foreground"
                )}
              >
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(event);
                    }}
                    className={cn(
                      "text-[10px] px-1 py-0.5 rounded truncate cursor-pointer",
                      event.color || "bg-primary/10 text-primary"
                    )}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-[10px] text-muted-foreground px-1">
                    +{dayEvents.length - 2} autre{dayEvents.length - 2 > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
