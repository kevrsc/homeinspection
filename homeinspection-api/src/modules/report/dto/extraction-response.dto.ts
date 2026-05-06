export type ReportObservationDto = {
  text: string;
};

export type ReportSectionDto = {
  sectionName: string;
  observations: ReportObservationDto[];
};

export type ReportUploadResponseDto = {
  pageCount: number;
  sections: ReportSectionDto[];
};
