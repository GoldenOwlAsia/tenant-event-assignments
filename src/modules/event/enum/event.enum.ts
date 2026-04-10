export enum EventType {
  TASK_CREATE = 'task_create',
  MAIL_NOTIFICATION = 'mail_notification',
}

export enum EventStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
