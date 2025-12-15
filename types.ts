export enum LoadingState {
  IDLE = 'IDLE',
  READING = 'READING',
  ROASTING = 'ROASTING',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS'
}

export interface RoastRequest {
  content: string;
  mimeType: string;
}

export interface RoastResponse {
  text: string;
}