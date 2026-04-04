import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from "typeorm";
import { Project } from "./Project";
import { User } from "./User";

@Entity()
export class Bug {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ default: "medium" })
  severity: string;

  @Column({ default: "pending" })
  status: string;

  @Column({ type: "text", nullable: true })
  reproduceSteps: string;

  @ManyToOne(() => Project, project => project.bugs)
  project: Project;

  @ManyToOne(() => User, user => user.assignedBugs, { nullable: true })
  assignee: User;

  @ManyToOne(() => User, user => user.reportedBugs)
  reporter: User;

  @Column({ nullable: true })
  dueDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}