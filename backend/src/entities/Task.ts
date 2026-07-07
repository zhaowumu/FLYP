import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, ManyToMany, JoinTable, Index } from "typeorm";
import { Project } from "./Project";
import { User } from "./User";
import { OperationLog } from "./OperationLog";

@Entity()
@Index(["status"])
@Index(["priority"])
@Index(["category"])
@Index(["dueDate"])
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

  @Column({ type: "varchar", nullable: true })
  category: string;

  @Column({ nullable: true })
  dueDate: Date;

  @ManyToOne(() => Project, project => project.tasks)
  @Index()
  project: Project;

  @ManyToMany(() => User, user => user.assignedTasks)
  @JoinTable()
  assignees: User[];

  @ManyToOne(() => User, user => user.createdTasks)
  @Index()
  creator: User;

  @ManyToOne(() => Task, task => task.subtasks, { nullable: true })
  parentTask: Task;

  @OneToMany(() => Task, task => task.parentTask)
  subtasks: Task[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: false })
  transferred: boolean;
}
