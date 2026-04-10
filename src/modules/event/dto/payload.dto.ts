import { CreateTaskBodyRequestDto } from '@/modules/task-management/dto/create-task.dto';

export interface PayLoadData extends CreateTaskBodyRequestDto {
  taskId: string;
  reporterId: string;
}

export interface SendMailData {
  to: string;
  subject: string;
  text: string;
}
