import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from "typeorm";
import { Project } from "./Project";
import { User } from "./User";
import { OperationLog } from "./OperationLog";

@Entity()
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ default: "medium" })
  priority: string;

  @Column({ default: "pending" })
  status: string;

  @Column({ nullable: true })
  dueDate: Date;

  @ManyToOne(() => Project, project => project.tasks)
  project: Project;

  @ManyToOne(() => User, user => user.assignedTasks)
  assignee: User;

  @ManyToOne(() => User, user => user.createdTasks)
  creator: User;

  @ManyToOne(() => Task, task => task.subtasks, { nullable: true })
  parentTask: Task;

  @OneToMany(() => Task, task => task.parentTask)
  subtasks: Task[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}