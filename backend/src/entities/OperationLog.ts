import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { User } from "./User";

@Entity()
export class OperationLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  targetType: string; // "task" or "bug"

  @Column()
  targetId: number;

  @ManyToOne(() => User)
  user: User;

  @Column()
  action: string; // "create", "status_change", "assign", "comment", "severity_change", "priority_change", etc.

  @Column({ nullable: true })
  oldStatus: string;

  @Column({ nullable: true })
  newStatus: string;

  @Column({ nullable: true })
  oldAssignee: string;

  @Column({ nullable: true })
  newAssignee: string;

  @Column({ nullable: true })
  oldPriority: string;

  @Column({ nullable: true })
  newPriority: string;

  @Column({ nullable: true })
  oldSeverity: string;

  @Column({ nullable: true })
  newSeverity: string;

  @Column({ nullable: true })
  oldDueDate: string;

  @Column({ nullable: true })
  newDueDate: string;

  @Column({ type: "text", nullable: true })
  remark: string;

  @CreateDateColumn()
  createdAt: Date;
}
