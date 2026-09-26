// 웹이 값으로 import하는 상수. zod·계약 정의를 클라이언트 번들에 끌어들이지 않도록 분리한다.
export const correctionKinds = ["builder_match", "ranking", "complex", "other"] as const;
export const correctionStatuses = ["received", "reviewing", "applied", "rejected"] as const;
