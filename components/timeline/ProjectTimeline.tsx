"use client";

import { useMemo, useState } from "react";
import { format, addDays, differenceInDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface GanttTask {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  progress: number; // 0-100
  color?: string;
  category?: string;
  dependencies?: string[];
}

interface ProjectTimelineProps {
  tasks: GanttTask[];
  onTaskClick?: (task: GanttTask) => void;
}

export function ProjectTimeline({
  tasks,
  onTaskClick,
}: ProjectTimelineProps) {
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);

  const { timelineStart, timelineEnd, totalDays, categories } = useMemo(() => {
    if (tasks.length === 0) {
      const now = new Date();
      return {
        timelineStart: now,
        timelineEnd: addDays(now, 30),
        totalDays: 30,
        categories: [] as string[],
      };
    }

    const starts = tasks.map((t) => t.startDate.getTime());
    const ends = tasks.map((t) => t.endDate.getTime());
    const minStart = new Date(Math.min(...starts));
    const maxEnd = new Date(Math.max(...ends));

    // Add padding
    const paddedStart = addDays(startOfDay(minStart), -2);
    const paddedEnd = addDays(startOfDay(maxEnd), 2);

    const days = differenceInDays(paddedEnd, paddedStart) + 1;
    const cats = [...new Set(tasks.map((t) => t.category).filter(Boolean))] as string[];

    return {
      timelineStart: paddedStart,
      timelineEnd: paddedEnd,
      totalDays: days,
      categories: cats,
    };
  }, [tasks]);

  // Generate month markers
  const monthMarkers = useMemo(() => {
    const markers: { date: Date; label: string; position: number }[] = [];
    let current = new Date(timelineStart.getFullYear(), timelineStart.getMonth(), 1);

    while (current <= timelineEnd) {
      const pos = differenceInDays(current, timelineStart);
      markers.push({
        date: new Date(current),
        label: format(current, "MMM yyyy", { locale: fr }),
        position: pos,
      });
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }
    return markers;
  }, [timelineStart, timelineEnd]);

  // Generate week markers
  const weekMarkers = useMemo(() => {
    const markers: number[] = [];
    for (let i = 0; i <= totalDays; i += 7) {
      markers.push(i);
    }
    return markers;
  }, [totalDays]);

  const getTaskPosition = (task: GanttTask) => {
    const start = differenceInDays(task.startDate, timelineStart);
    const duration = differenceInDays(task.endDate, task.startDate) + 1;
    return {
      left: Math.max(0, start),
      width: Math.max(1, duration),
    };
  };

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        <p className="text-sm">Aucune tâche à afficher</p>
        <p className="text-xs mt-1">Ajoutez des tâches pour voir la timeline</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Timeline header - months */}
          <div className="flex border-b bg-muted/30">
            <div className="w-48 shrink-0 p-2 border-r font-medium text-sm">
              Tâche
            </div>
            <div className="flex-1 relative h-8">
              {monthMarkers.map((marker, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full border-l border-border pl-1 text-[10px] text-muted-foreground"
                  style={{ left: `${(marker.position / totalDays) * 100}%` }}
                >
                  {marker.label}
                </div>
              ))}
            </div>
          </div>

          {/* Timeline header - weeks */}
          <div className="flex border-b">
            <div className="w-48 shrink-0 border-r" />
            <div className="flex-1 relative h-5 bg-muted/10">
              {weekMarkers.map((pos) => (
                <div
                  key={pos}
                  className="absolute top-0 h-full border-l border-border/50 text-[9px] text-muted-foreground/50 pl-0.5"
                  style={{ left: `${(pos / totalDays) * 100}%` }}
                >
                  S{Math.floor(pos / 7) + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Task rows */}
          <div className="divide-y">
            {tasks.map((task) => {
              const pos = getTaskPosition(task);
              const isHovered = hoveredTask === task.id;

              return (
                <div
                  key={task.id}
                  className="flex items-center hover:bg-muted/20 transition-colors"
                >
                  {/* Task name */}
                  <div className="w-48 shrink-0 p-2 border-r">
                    <p
                      className="text-sm font-medium truncate cursor-pointer"
                      onClick={() => onTaskClick?.(task)}
                    >
                      {task.name}
                    </p>
                    {task.category && (
                      <p className="text-[10px] text-muted-foreground">
                        {task.category}
                      </p>
                    )}
                  </div>

                  {/* Gantt bar */}
                  <div className="flex-1 relative h-10">
                    {/* Grid lines */}
                    {weekMarkers.map((pos) => (
                      <div
                        key={pos}
                        className="absolute top-0 h-full border-l border-border/20"
                        style={{ left: `${(pos / totalDays) * 100}%` }}
                      />
                    ))}

                    {/* Today line */}
                    {(() => {
                      const todayPos = differenceInDays(
                        startOfDay(new Date()),
                        timelineStart
                      );
                      if (todayPos >= 0 && todayPos <= totalDays) {
                        return (
                          <div
                            className="absolute top-0 h-full w-px bg-red-500 z-10"
                            style={{ left: `${(todayPos / totalDays) * 100}%` }}
                          />
                        );
                      }
                      return null;
                    })()}

                    {/* Task bar */}
                    <div
                      className={cn(
                        "absolute top-2 h-6 rounded-md cursor-pointer transition-all",
                        isHovered ? "ring-2 ring-primary/30 shadow-md" : "shadow-sm"
                      )}
                      style={{
                        left: `${(pos.left / totalDays) * 100}%`,
                        width: `${(pos.width / totalDays) * 100}%`,
                        backgroundColor: task.color || "hsl(var(--primary))",
                      }}
                      onClick={() => onTaskClick?.(task)}
                      onMouseEnter={() => setHoveredTask(task.id)}
                      onMouseLeave={() => setHoveredTask(null)}
                    >
                      {/* Progress fill */}
                      <div
                        className="h-full rounded-md bg-black/20"
                        style={{ width: `${task.progress}%` }}
                      />

                      {/* Label */}
                      {pos.width > 3 && (
                        <span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium text-white truncate">
                          {task.progress > 0 ? `${task.progress}%` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 p-2 border-t bg-muted/10 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-red-500 inline-block" /> Aujourd&apos;hui
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-primary inline-block" /> Tâche
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-black/20 inline-block" /> Progression
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
