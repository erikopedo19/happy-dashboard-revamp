import { Image, HStack, ProgressView, Text, VStack } from "@expo/ui/swift-ui";
import {
  activityBackgroundTint,
  font,
  foregroundStyle,
  frame,
  progressViewStyle,
  tint,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity } from "expo-widgets";

export type BookingActivityProps = {
  kind: "next" | "new" | "cancelled";
  title: string;
  subtitle: string;
  timeLabel: string;
  startsAt: number;
  countdownFrom: number;
};

const RED = "#FF2D46";
const LIME = "#A3E635";
const ACTIVITY_URL = "cutzioo://agenda";

const dateRange = (props: BookingActivityProps) => ({
  lower: new Date(props.countdownFrom),
  upper: new Date(props.startsAt),
});

const activityColor = (kind: BookingActivityProps["kind"]) =>
  kind === "new" ? LIME : RED;

function ActivityRing({
  props,
  size = 18,
}: {
  props: BookingActivityProps;
  size?: number;
}) {
  if (props.kind === "cancelled") {
    return <Image systemName="xmark.circle.fill" size={size} color={RED} />;
  }

  return (
    <ProgressView
      timerInterval={dateRange(props)}
      countsDown={false}
      modifiers={[
        progressViewStyle("circular"),
        frame({ width: size, height: size }),
        tint(activityColor(props.kind)),
      ]}
    />
  );
}

function ActivitySymbol({ kind }: { kind: BookingActivityProps["kind"] }) {
  const systemName =
    kind === "next"
      ? "scissors"
      : kind === "new"
        ? "calendar.badge.checkmark"
        : "calendar.badge.minus";
  return (
    <Image
      systemName={systemName}
      size={22}
      color={kind === "cancelled" ? RED : activityColor(kind)}
    />
  );
}

function Countdown({ props }: { props: BookingActivityProps }) {
  if (props.kind === "cancelled") return <Text>Cancelled</Text>;
  return (
    <Text
      timerInterval={dateRange(props)}
      countsDown
      modifiers={[
        font({ size: 12, weight: "semibold", design: "monospaced" }),
        foregroundStyle("#FFFFFF"),
      ]}
    />
  );
}

const BookingActivityLayout = (props: BookingActivityProps) => {
  "widget";

  const textStyle = foregroundStyle("#FFFFFF");

  return {
    compactLeading: <ActivityRing props={props} />,
    compactTrailing: <Countdown props={props} />,
    minimal: <ActivityRing props={props} />,
    expandedLeading: <ActivitySymbol kind={props.kind} />,
    expandedCenter: (
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[font({ size: 14, weight: "semibold" }), textStyle]}>
          {props.title}
        </Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle("#D4D4D8")]}>
          {props.timeLabel}
        </Text>
      </VStack>
    ),
    expandedTrailing: <Countdown props={props} />,
    expandedBottom: (
      <VStack alignment="leading" spacing={8}>
        <Text modifiers={[font({ size: 12 }), foregroundStyle("#D4D4D8")]}>
          {props.subtitle}
        </Text>
        {props.kind !== "cancelled" ? (
          <ProgressView
            timerInterval={dateRange(props)}
            countsDown={false}
            modifiers={[
              progressViewStyle("linear"),
              tint(activityColor(props.kind)),
            ]}
          />
        ) : null}
      </VStack>
    ),
    banner: (
      <VStack
        spacing={10}
        modifiers={[
          activityBackgroundTint("#0B0B0F"),
          widgetURL(ACTIVITY_URL),
        ]}
      >
        <HStack spacing={12}>
          <ActivityRing props={props} size={24} />
          <VStack alignment="leading" spacing={3}>
            <Text modifiers={[font({ size: 16, weight: "semibold" }), textStyle]}>
              {props.title}
            </Text>
            <Text modifiers={[font({ size: 13 }), foregroundStyle("#D4D4D8")]}>
              {props.subtitle}
            </Text>
          </VStack>
        </HStack>
        <Text modifiers={[font({ size: 13, weight: "medium" }), textStyle]}>
          {props.timeLabel}
        </Text>
      </VStack>
    ),
  };
};

export default createLiveActivity("BookingActivity", BookingActivityLayout);
