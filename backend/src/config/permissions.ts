export const DEFAULT_ROLE_PERMISSIONS = {
  admin: {
    task: {
      create: true,
      assign: true,
      restart: true,
      comment: true,
      delete: true,
      extendDueDate: true,
    },
    bug: {
      create: true,
      assign: true,
      restartBug: true,
      rejectBug: true,
      comment: true,
      delete: true,
      extendDueDate: true,
    },
    project: {
      create: true,
      delete: true,
    },
  },
  project_manager: {
    task: {
      create: true,
      assign: true,
      restart: true,
      comment: true,
      delete: true,
      extendDueDate: true,
    },
    bug: {
      create: true,
      assign: true,
      restartBug: true,
      rejectBug: true,
      comment: true,
      delete: true,
      extendDueDate: true,
    },
    project: {
      create: true,
      delete: false,
    },
  },
  developer: {
    task: {
      create: true,
      assign: false,
      restart: true,
      comment: true,
      delete: false,
      extendDueDate: false,
    },
    bug: {
      create: true,
      assign: false,
      restartBug: true,
      rejectBug: true,
      comment: true,
      delete: false,
      extendDueDate: false,
    },
    project: {
      create: false,
      delete: false,
    },
  },
  artist: {
    task: {
      create: true,
      assign: false,
      restart: true,
      comment: true,
      delete: false,
      extendDueDate: false,
    },
    bug: {
      create: true,
      assign: false,
      restartBug: true,
      rejectBug: true,
      comment: true,
      delete: false,
      extendDueDate: false,
    },
    project: {
      create: false,
      delete: false,
    },
  },
  designer: {
    task: {
      create: true,
      assign: false,
      restart: true,
      comment: true,
      delete: false,
      extendDueDate: false,
    },
    bug: {
      create: true,
      assign: false,
      restartBug: true,
      comment: true,
      delete: false,
      extendDueDate: false,
    },
    project: {
      create: false,
      delete: false,
    },
  },
  tester: {
    task: {
      create: true,
      assign: false,
      restart: true,
      comment: true,
      delete: false,
      extendDueDate: false,
    },
    bug: {
      create: true,
      assign: false,
      restartBug: true,
      rejectBug: true,
      comment: true,
      delete: false,
      extendDueDate: false,
    },
    project: {
      create: false,
      delete: false,
    },
  },
};

export const TASK_ACTION_LABELS: Record<string, string> = {
  create: "创建任务",
  assign: "指派",
  restart: "重启",
  comment: "备注",
  delete: "删除",
  extendDueDate: "延期",
};

export const BUG_ACTION_LABELS: Record<string, string> = {
  create: "创建BUG",
  assign: "分配",
  restartBug: "重启",
  rejectBug: "打回",
  comment: "备注",
  delete: "删除",
  extendDueDate: "延期",
};

export const PROJECT_ACTION_LABELS: Record<string, string> = {
  create: "创建项目",
  delete: "删除项目",
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "管理员",
  project_manager: "项目经理",
  developer: "程序",
  artist: "美术",
  designer: "策划",
  tester: "测试",
};
