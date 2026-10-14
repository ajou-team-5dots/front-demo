'use client';

import { type ReactNode, useState } from 'react';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ChartTabsProps {
  tabs: { id: string; label: string; content: ReactNode }[];
}

/** Switch between alternative charts of the same data. */
export function ChartTabs({ tabs }: ChartTabsProps) {
  const [active, setActive] = useState(tabs[0]?.id ?? '');
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];
  return (
    <div className="flex flex-col gap-4">
      <Tabs value={active} onValueChange={(value: string) => setActive(value)}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {current?.content}
    </div>
  );
}
