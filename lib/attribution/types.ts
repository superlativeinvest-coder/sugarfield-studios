export type AttributionValues = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  content_id?: string;
  ttclid?: string;
  landing_page?: string;
  referrer?: string;
  ref?: string;
  funnel?: string;
};

export type AttributionState = {
  firstTouch: AttributionValues;
  currentTouch: AttributionValues;
};
