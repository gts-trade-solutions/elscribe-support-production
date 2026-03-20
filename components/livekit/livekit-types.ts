export type CallReq = {
  id: string;
  type: "voice" | "video";
  status: string;
};

export type TokenResponse = {
  ok: true;
  url: string;
  roomName: string;
  token: string;
  callRequest: CallReq;
};
