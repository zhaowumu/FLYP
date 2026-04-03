import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, ManyToMany, JoinTable } from "typeorm";
import { Team } from "./Team";
import { Project } from "./Project";
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

  @ManyToOne(() => Team, team => team.users, { nullable: true })
  team: Team;

  @ManyToMany(() => Project, project => project.members)
  @JoinTable()
  projects: Project[];

  @OneToMany(() => Task, task => task.assignee)
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