import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinTable, OneToMany } from "typeorm";
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

  @ManyToMany(() => User)
  @JoinTable()
  managers: User[];

  @OneToMany(() => Task, task => task.project)
  tasks: Task[];

  @OneToMany(() => Bug, bug => bug.project)
  bugs: Bug[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
