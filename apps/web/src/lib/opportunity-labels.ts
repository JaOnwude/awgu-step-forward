const opportunityTypeLabels: Record<string, string> = {
  training: "Training",
  apprenticeship: "Apprenticeship",
  scholarship: "Scholarship",
  employment: "Employment",
  local_work: "Local paid work",
  contract: "Contract",
};

const deliveryModeLabels: Record<string, string> = {
  onsite: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
};

const applicationRouteLabels: Record<string, string> = {
  platform: "Apply in-platform",
  external: "Apply on provider site",
  in_person: "Apply in person",
};

export function opportunityTypeLabel(value: string): string {
  return opportunityTypeLabels[value] ?? value;
}

export function deliveryModeLabel(value: string): string {
  return deliveryModeLabels[value] ?? value;
}

export function applicationRouteLabel(value: string): string {
  return applicationRouteLabels[value] ?? value;
}
