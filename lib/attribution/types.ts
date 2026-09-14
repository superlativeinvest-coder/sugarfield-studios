export type AttributionValues = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  ref?: string;
  funnel?: string;
};

export type AttributionState = {
  firstTouch: AttributionValues;
  currentTouch: AttributionValues;
};
