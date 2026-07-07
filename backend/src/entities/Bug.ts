import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index } from "typeorm";
import { Project } from "./Project";
import { User } from "./User";

@Entity()
@Index(["status"])
@Index(["severity"])
@Index(["category"])
@Index(["dueDate"])
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
  @Index()
  project: Project;

  @ManyToOne(() => User, user => user.assignedBugs, { nullable: true })
  @Index()
  assignee: User;

  @ManyToOne(() => User, user => user.reportedBugs)
  @Index()
  reporter: User;

  @Column({ type: "varchar", nullable: true })
  category: string;

  @Column({ nullable: true })
  dueDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: false })
  transferred: boolean;
}