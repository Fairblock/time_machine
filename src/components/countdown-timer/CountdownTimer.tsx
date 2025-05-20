'use client';
import { useEffect, useState } from 'react';

import { getNextFridayDeadline } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';



export default function CountdownTimer() {
  const [deadlineText, setDeadlineText] = useState<string>('');

  useEffect(() => {
    const deadline = getNextFridayDeadline();

    // get weekday in UTC
    const weekday = deadline.toLocaleDateString('en-US', {
      weekday: 'long',
      timeZone: 'UTC',
    });

    // get hours/minutes in UTC and convert to 12-hour clock
    const hoursUTC = deadline.getUTCHours();
    const minutesUTC = deadline.getUTCMinutes();
    const period = hoursUTC >= 12 ? 'PM' : 'AM';
    const hour12 = ((hoursUTC + 11) % 12) + 1;
    const minuteStr = minutesUTC.toString().padStart(2, '0');

    // if you don’t want “:00”, you can drop the minutes when zero
    const timePart =
      minutesUTC === 0 ? `${hour12} ${period}` : `${hour12}:${minuteStr} ${period}`;

    setDeadlineText(`${weekday} at ${timePart} UTC`);
  }, []);

  return (
    <div className="text-sm text-muted-foreground">
      ⏳ Your prediction decrypts on {deadlineText} ⌛
    </div>
  );
}
