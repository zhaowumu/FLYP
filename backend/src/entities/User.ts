import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToMany } from "typeorm";
import { Task } from "./Task";
import { Bug } from "./Bug";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column()
  realName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ default: "developer" })
  role: string;

  @Column({ default: true })
  isActive: boolean;

  @ManyToMany(() => Task, task => task.assignees)
  assignedTasks: Task[];

  @OneToMany(() => Task, task => task.creator)
  createdTasks: Task[];

  @OneToMany(() => Bug, bug => bug.assignee)
  assignedBugs: Bug[];

  @OneToMany(() => Bug, bug => bug.reporter)
  reportedBugs: Bug[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}