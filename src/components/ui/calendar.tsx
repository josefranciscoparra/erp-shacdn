"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { differenceInCalendarDays } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import {
  DayPicker,
  DayButton,
  labelNext,
  labelPrevious,
  useDayPicker,
  type DayPickerProps,
  type DayContentProps
} from "react-day-picker";

export type CalendarProps = DayPickerProps & {
  /**
   * In the year view, the number of years to display at once.
   * @default 12
   */
  yearRange?: number;

  /**
   * Wether to show the year switcher in the caption.
   * @default true
   */
  showYearSwitcher?: boolean;

  monthsClassName?: string;
  monthCaptionClassName?: string;
  weekdaysClassName?: string;
  weekdayClassName?: string;
  monthClassName?: string;
  captionClassName?: string;
  captionLabelClassName?: string;
  buttonNextClassName?: string;
  buttonPreviousClassName?: string;
  navClassName?: string;
  monthGridClassName?: string;
  weekClassName?: string;
  dayClassName?: string;
  dayButtonClassName?: string;
  rangeStartClassName?: string;
  rangeEndClassName?: string;
  selectedClassName?: string;
  todayClassName?: string;
  outsideClassName?: string;
  disabledClassName?: string;
  rangeMiddleClassName?: string;
  hiddenClassName?: string;
  /**
   * Expands the calendar to use the full width of its container.
   */
  fullWidth?: boolean;
  /**
   * Custom renderer to augment the day content.
   */
  dayContent?: (props: DayContentProps) => React.ReactNode;
};

type NavView = "days" | "years";

/**
 * A custom calendar component built on top of react-day-picker.
 * @param props The props for the calendar.
 * @default yearRange 12
 * @returns
 */
export function useCalendarClassNames(overrides?: Partial<Record<keyof DayPickerProps["classNames"], string>>) {
  return {
    months: cn("relative flex gap-6 border-l border-dashed border-border/40 pl-3", overrides?.months),
    month_caption: cn("relative mx-10 flex h-7 items-center justify-center", overrides?.month_caption),
    weekdays: cn("flex flex-row", overrides?.weekdays),
    weekday: cn("w-8 text-sm font-normal text-muted-foreground", overrides?.weekday),
    month: cn("w-full", overrides?.month),
    caption: cn("relative flex items-center justify-center pt-1", overrides?.caption),
    caption_label: cn("truncate text-sm font-medium", overrides?.caption_label),
    button_next: cn(
      buttonVariants({ variant: "outline" }),
      "absolute right-0 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
      overrides?.button_next
    ),
    button_previous: cn(
      buttonVariants({ variant: "outline" }),
      "absolute left-0 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
      overrides?.button_previous
    ),
    nav: cn("flex items-start", overrides?.nav),
    month_grid: cn("mx-auto mt-4", overrides?.month_grid),
    week: cn("mt-2 flex w-max items-start", overrides?.week),
    day: cn("flex size-8 flex-1 items-center justify-center p-0 text-sm", overrides?.day),
    day_button: cn(
      buttonVariants({ variant: "ghost" }),
      "size-8 rounded-md p-0 font-normal transition-none aria-selected:opacity-100 relative overflow-hidden",
      overrides?.day_button
    ),
    range_start: cn(
      "bg-accent [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground day-range-start rounded-s-md",
      overrides?.range_start
    ),
    range_middle: cn(
      "bg-accent !text-foreground [&>button]:bg-transparent [&>button]:!text-foreground [&>button]:hover:bg-transparent [&>button]:hover:!text-foreground",
      overrides?.range_middle
    ),
    range_end: cn(
      "bg-accent [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground day-range-end rounded-e-md",
      overrides?.range_end
    ),
    selected: cn(
      "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
      overrides?.selected
    ),
    today: cn("[&>button]:bg-accent [&>button]:text-accent-foreground", overrides?.today),
    outside: cn(
      "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
      overrides?.outside
    ),
    disabled: cn("text-muted-foreground opacity-50", overrides?.disabled),
    hidden: cn("invisible flex-1", overrides?.hidden)
  };
}

function Calendar({
  className,
  style,
  showOutsideDays = true,
  showYearSwitcher = true,
  yearRange = 12,
  numberOfMonths,
  fullWidth = false,
  components: externalComponents,
  dayContent,
  ...props
}: CalendarProps) {
  const [navView, setNavView] = React.useState<NavView>("days");
  const [displayYears, setDisplayYears] = React.useState<{
    from: number;
    to: number;
  }>(
    React.useMemo(() => {
      const currentYear = new Date().getFullYear();
      return {
        from: currentYear - Math.floor(yearRange / 2 - 1),
        to: currentYear + Math.ceil(yearRange / 2)
      };
    }, [yearRange])
  );

  const {
    onNextClick,
    onPrevClick,
    startMonth,
    endMonth,
    monthsClassName,
    monthCaptionClassName,
    weekdaysClassName,
    weekdayClassName,
    monthClassName,
    captionClassName,
    captionLabelClassName,
    buttonNextClassName,
    buttonPreviousClassName,
    navClassName,
    monthGridClassName,
    weekClassName,
    dayClassName,
    dayButtonClassName,
    rangeStartClassName,
    rangeEndClassName,
    selectedClassName,
    todayClassName,
    outsideClassName,
    disabledClassName,
    rangeMiddleClassName,
    hiddenClassName,
    ...dayPickerProps
  } = props;

  const columnsDisplayed = navView === "years" ? 1 : numberOfMonths;
  const calendarStyle: React.CSSProperties = {
    width: `${248.8 * (columnsDisplayed ?? 1)}px`,
    ...style
  };

  if (fullWidth) {
    calendarStyle.width = "100%";
  }

  const calendarClassNames = useCalendarClassNames({
    months: monthsClassName,
    month_caption: monthCaptionClassName,
    weekdays: weekdaysClassName,
    weekday: weekdayClassName,
    month: monthClassName,
    caption: captionClassName,
    caption_label: captionLabelClassName,
    button_next: buttonNextClassName,
    button_previous: buttonPreviousClassName,
    nav: navClassName,
    month_grid: monthGridClassName,
    week: weekClassName,
    day: dayClassName,
    day_button: dayButtonClassName,
    range_start: rangeStartClassName,
    range_end: rangeEndClassName,
    range_middle: rangeMiddleClassName,
    selected: selectedClassName,
    today: todayClassName,
    outside: outsideClassName,
    disabled: disabledClassName,
    hidden: hiddenClassName
  });

  const defaultComponents = {
    Chevron: ({ orientation }: { orientation: "left" | "right" }) => {
      const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
      return <Icon className="h-4 w-4" />;
    },
    Nav: ({ className }: { className?: string }) => (
      <Nav
        className={className}
        displayYears={displayYears}
        navView={navView}
        setDisplayYears={setDisplayYears}
        startMonth={startMonth}
        endMonth={endMonth}
        onPrevClick={onPrevClick}
        onNextClick={onNextClick}
      />
    ),
    CaptionLabel: (captionProps: React.ComponentProps<typeof CaptionLabel>) => (
      <CaptionLabel
        showYearSwitcher={showYearSwitcher}
        navView={navView}
        setNavView={setNavView}
        displayYears={displayYears}
        {...captionProps}
      />
    ),
    MonthGrid: ({
      className,
      children,
      ...monthGridProps
    }: React.ComponentProps<typeof MonthGrid>) => (
      <MonthGrid
        children={children}
        className={className}
        displayYears={displayYears}
        startMonth={startMonth}
        endMonth={endMonth}
        navView={navView}
        setNavView={setNavView}
        {...monthGridProps}
      />
    )
  };

  const mergedComponents = {
    ...defaultComponents,
    ...externalComponents
  };

  mergedComponents.DayContent = (dayProps: DayContentProps) => {
    if (dayContent) {
      return <>{dayContent(dayProps)}</>;
    }
    if (externalComponents?.DayContent) {
      const CustomDayContent = externalComponents.DayContent;
      return <CustomDayContent {...dayProps} />;
    }
    return <>{dayProps.children}</>;
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      style={calendarStyle}
      classNames={calendarClassNames}
      components={mergedComponents}
      numberOfMonths={columnsDisplayed}
      {...dayPickerProps}
    />
  );
}
Calendar.displayName = "Calendar";

function Nav({
  className,
  navView,
  startMonth,
  endMonth,
  displayYears,
  setDisplayYears,
  onPrevClick,
  onNextClick
}: {
  className?: string;
  navView: NavView;
  startMonth?: Date;
  endMonth?: Date;
  displayYears: { from: number; to: number };
  setDisplayYears: React.Dispatch<React.SetStateAction<{ from: number; to: number }>>;
  onPrevClick?: (date: Date) => void;
  onNextClick?: (date: Date) => void;
}) {
  const { nextMonth, previousMonth, goToMonth } = useDayPicker();

  const isPreviousDisabled = (() => {
    if (navView === "years") {
      return (
        (startMonth &&
          differenceInCalendarDays(new Date(displayYears.from - 1, 0, 1), startMonth) < 0) ||
        (endMonth && differenceInCalendarDays(new Date(displayYears.from - 1, 0, 1), endMonth) > 0)
      );
    }
    return !previousMonth;
  })();

  const isNextDisabled = (() => {
    if (navView === "years") {
      return (
        (startMonth &&
          differenceInCalendarDays(new Date(displayYears.to + 1, 0, 1), startMonth) < 0) ||
        (endMonth && differenceInCalendarDays(new Date(displayYears.to + 1, 0, 1), endMonth) > 0)
      );
    }
    return !nextMonth;
  })();

  const handlePreviousClick = React.useCallback(() => {
    if (!previousMonth) return;
    if (navView === "years") {
      setDisplayYears((prev) => ({
        from: prev.from - (prev.to - prev.from + 1),
        to: prev.to - (prev.to - prev.from + 1)
      }));
      onPrevClick?.(new Date(displayYears.from - (displayYears.to - displayYears.from), 0, 1));
      return;
    }
    goToMonth(previousMonth);
    onPrevClick?.(previousMonth);
  }, [previousMonth, goToMonth]);

  const handleNextClick = React.useCallback(() => {
    if (!nextMonth) return;
    if (navView === "years") {
      setDisplayYears((prev) => ({
        from: prev.from + (prev.to - prev.from + 1),
        to: prev.to + (prev.to - prev.from + 1)
      }));
      onNextClick?.(new Date(displayYears.from + (displayYears.to - displayYears.from), 0, 1));
      return;
    }
    goToMonth(nextMonth);
    onNextClick?.(nextMonth);
  }, [goToMonth, nextMonth]);
  return (
    <nav className={cn("flex items-center", className)}>
      <Button
        variant="outline"
        className="absolute left-0 h-7 w-7 bg-transparent p-0 opacity-80 hover:opacity-100"
        type="button"
        tabIndex={isPreviousDisabled ? undefined : -1}
        disabled={isPreviousDisabled}
        aria-label={
          navView === "years"
            ? `Go to the previous ${displayYears.to - displayYears.from + 1} years`
            : labelPrevious(previousMonth)
        }
        onClick={handlePreviousClick}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        className="absolute right-0 h-7 w-7 bg-transparent p-0 opacity-80 hover:opacity-100"
        type="button"
        tabIndex={isNextDisabled ? undefined : -1}
        disabled={isNextDisabled}
        aria-label={
          navView === "years"
            ? `Go to the next ${displayYears.to - displayYears.from + 1} years`
            : labelNext(nextMonth)
        }
        onClick={handleNextClick}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}

function CaptionLabel({
  children,
  showYearSwitcher,
  navView,
  setNavView,
  displayYears,
  ...props
}: {
  showYearSwitcher?: boolean;
  navView: NavView;
  setNavView: React.Dispatch<React.SetStateAction<NavView>>;
  displayYears: { from: number; to: number };
} & React.HTMLAttributes<HTMLSpanElement>) {
  if (!showYearSwitcher) return <span {...props}>{children}</span>;
  return (
    <Button
      className="h-7 w-full truncate text-sm font-medium"
      variant="ghost"
      size="sm"
      onClick={() => setNavView((prev) => (prev === "days" ? "years" : "days"))}>
      {navView === "days" ? children : displayYears.from + " - " + displayYears.to}
    </Button>
  );
}

function MonthGrid({
  className,
  children,
  displayYears,
  startMonth,
  endMonth,
  navView,
  setNavView,
  ...props
}: {
  className?: string;
  children: React.ReactNode;
  displayYears: { from: number; to: number };
  startMonth?: Date;
  endMonth?: Date;
  navView: NavView;
  setNavView: React.Dispatch<React.SetStateAction<NavView>>;
} & React.TableHTMLAttributes<HTMLTableElement>) {
  if (navView === "years") {
    return (
      <YearGrid
        displayYears={displayYears}
        startMonth={startMonth}
        endMonth={endMonth}
        setNavView={setNavView}
        navView={navView}
        className={className}
        {...props}
      />
    );
  }
  return (
    <table className={className} {...props}>
      {children}
    </table>
  );
}

function YearGrid({
  className,
  displayYears,
  startMonth,
  endMonth,
  setNavView,
  navView,
  ...props
}: {
  className?: string;
  displayYears: { from: number; to: number };
  startMonth?: Date;
  endMonth?: Date;
  setNavView: React.Dispatch<React.SetStateAction<NavView>>;
  navView: NavView;
} & React.HTMLAttributes<HTMLDivElement>) {
  const { goToMonth, selected } = useDayPicker();

  return (
    <div className={cn("grid grid-cols-4 gap-y-2", className)} {...props}>
      {Array.from({ length: displayYears.to - displayYears.from + 1 }, (_, i) => {
        const isBefore =
          differenceInCalendarDays(new Date(displayYears.from + i, 11, 31), startMonth!) < 0;

        const isAfter =
          differenceInCalendarDays(new Date(displayYears.from + i, 0, 0), endMonth!) > 0;

        const isDisabled = isBefore || isAfter;
        return (
          <Button
            key={i}
            className={cn(
              "text-foreground h-7 w-full text-sm font-normal",
              displayYears.from + i === new Date().getFullYear() &&
                "bg-accent text-accent-foreground font-medium"
            )}
            variant="ghost"
            onClick={() => {
              setNavView("days");
              goToMonth(
                new Date(displayYears.from + i, (selected as Date | undefined)?.getMonth() ?? 0)
              );
            }}
            disabled={navView === "years" ? isDisabled : undefined}>
            {displayYears.from + i}
          </Button>
        );
      })}
    </div>
  );
}

// Export CalendarDayButton for custom implementations
const CalendarDayButton = DayButton;

export { Calendar, CalendarDayButton };
