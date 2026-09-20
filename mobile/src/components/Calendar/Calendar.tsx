import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Motion } from '@/components/Motion';
import { feedback } from '@/utils/feedback';
import { IconButton } from '@/components/IconButton';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type CalendarProps = {
  renderDay?: (date: Date, selected: boolean) => ReactNode;
  disabledDate?: (date: Date) => boolean;
  initialMonth?: Date;
  locale?: string;
  maximumDate?: Date;
  minimumDate?: Date;
  onMonthChange?: (month: Date) => void;
  onSelectDate: (date: Date) => void;
  selectedDate?: Date | null;
  style?: StyleProp<ViewStyle>;
};

const weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(first: Date | null | undefined, second: Date) {
  return Boolean(
    first &&
      first.getFullYear() === second.getFullYear() &&
      first.getMonth() === second.getMonth() &&
      first.getDate() === second.getDate(),
  );
}

function getMonthDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const leadingEmptyDays = (firstDay.getDay() + 6) % 7;
  const totalDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = Array.from({ length: leadingEmptyDays }, () => null);

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export function Calendar({
  renderDay,
  disabledDate,
  initialMonth,
  locale = 'fr-FR',
  maximumDate,
  minimumDate,
  onMonthChange,
  onSelectDate,
  selectedDate,
  style,
}: CalendarProps) {
  const [displayedMonth, setDisplayedMonth] = useState(() => {
    const source = initialMonth ?? selectedDate ?? new Date();
    return new Date(source.getFullYear(), source.getMonth(), 1);
  });
  const days = useMemo(() => getMonthDays(displayedMonth), [displayedMonth]);
  const minimum = minimumDate ? startOfDay(minimumDate) : undefined;
  const maximum = maximumDate ? startOfDay(maximumDate) : undefined;
  const monthTitle = displayedMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  const changeMonth = (delta: number) => {
    const next = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + delta, 1);
    feedback();
    setDisplayedMonth(next);
    onMonthChange?.(next);
  };

  return (
    <View style={[styles.calendar, style]}>
      <View style={styles.monthHeader}>
        <IconButton
          accessibilityLabel="Mois précédent"
          icon={<Text style={styles.arrow}>‹</Text>}
          onPress={() => changeMonth(-1)}
          size={36}
          variant="ghost"
        />
        <Text style={styles.monthTitle}>{monthTitle}</Text>
        <IconButton
          accessibilityLabel="Mois suivant"
          icon={<Text style={styles.arrow}>›</Text>}
          onPress={() => changeMonth(1)}
          size={36}
          variant="ghost"
        />
      </View>

      <View style={styles.weekRow}>
        {weekdays.map((weekday, index) => (
          <Text key={`${weekday}-${index}`} style={styles.weekday}>{weekday}</Text>
        ))}
      </View>

      <Motion trigger={displayedMonth.getTime()} style={styles.days}>
        {days.map((date, index) => {
          if (!date) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const disabled = Boolean(
            (minimum && date < minimum) ||
              (maximum && date > maximum) ||
              disabledDate?.(date),
          );
          const selected = isSameDay(selectedDate, date);
          const today = isSameDay(new Date(), date);

          return (
            <Pressable
              key={date.toISOString()}
              accessibilityLabel={date.toLocaleDateString(locale, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              accessibilityRole="button"
              accessibilityState={{ disabled, selected }}
              disabled={disabled}
              onPress={() => { if (!selected) feedback(); onSelectDate(date); }}
              style={({ pressed }) => [
                styles.dayCell,
                renderDay && { padding: 2, aspectRatio: 0.8 },
                !renderDay && selected && styles.selectedDay,
                !renderDay && today && !selected && styles.today,
                pressed && !disabled && styles.pressedDay,
              ]}
            >
              <Motion trigger={selected} delay={selected ? 0 : Math.min(index, 30) * 8} pop style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              {renderDay ? renderDay(date, selected) : <Text style={[styles.dayText, selected && styles.selectedDayText, disabled && styles.disabledDayText]}>
                {date.getDate()}
              </Text>}
              </Motion>
            </Pressable>
          );
        })}
      </Motion>
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 16,
  },
  monthHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthTitle: {
    color: '#141b41',
    fontFamily: fontFamily.bold,
    fontSize: 15,
    textTransform: 'capitalize',
  },
  arrow: {
    color: colors.primary,
    fontFamily: fontFamily.regular,
    fontSize: 31,
    lineHeight: 32,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekday: {
    color: '#91a0be',
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: 10,
    paddingBottom: 8,
    textAlign: 'center',
  },
  days: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    alignItems: 'center',
    aspectRatio: 1,
    borderRadius: 100,
    justifyContent: 'center',
    width: '14.2857%',
  },
  selectedDay: {
    backgroundColor: colors.primary,
  },
  today: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  pressedDay: {
    opacity: 0.7,
  },
  dayText: {
    color: '#30446e',
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
  },
  selectedDayText: {
    color: colors.surface,
  },
  disabledDayText: {
    color: '#cbd4e4',
  },
});
