import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, ManyToMany } from "typeorm";
import { Team } from "./Team";
import { User } from "./User";
import { Task } from "./Task";
import { Bug } from "./Bug";

@Entity()
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: "active" })
  status: string;

  @Column()
  createdBy: number;

  @ManyToOne(() => User, { nullable: true })
  manager: User;

  @ManyToOne(() => Team, team => team.projects)
  team: Team;

  @ManyToMany(() => User, user => user.projects)
  members: User[];

  @OneToMany(() => Task, task => task.project)
  tasks: Task[];

  @OneToMany(() => Bug, bug => bug.project)
  bugs: Bug[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}