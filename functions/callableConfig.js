/** Gen2 callable: localhost / 本番ホストの CORS（origin はスキーム付きまたは正規表現） */
export const callableCors = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/tsureben\.web\.app$/,
  /^https:\/\/tsureben\.firebaseapp\.com$/,
];

export const defaultCallableOptions = {
  cors: callableCors,
};

/** 一括登録は Auth 操作が多く時間がかかる */
export const bulkCallableOptions = {
  cors: callableCors,
  timeoutSeconds: 300,
  memory: "512MiB",
};
