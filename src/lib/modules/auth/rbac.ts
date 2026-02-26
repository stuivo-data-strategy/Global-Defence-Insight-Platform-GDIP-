export type ConfiguredRole = 'admin' | 'member' | 'viewer';
export type ResourceAction = 'create' | 'read' | 'update' | 'delete' | 'harvest';

const rolePermissions: Record<ConfiguredRole, ResourceAction[]> = {
    admin: ['create', 'read', 'update', 'delete', 'harvest'],
    member: ['create', 'read', 'update', 'harvest'],
    viewer: ['read']
};

export const canPerformAction = (role: ConfiguredRole, action: ResourceAction): boolean => {
    return rolePermissions[role]?.includes(action) ?? false;
};

export const requirePermission = (userRole: string, requiredAction: ResourceAction) => {
    if (!canPerformAction(userRole as ConfiguredRole, requiredAction)) {
        throw new Error(`Unauthorized: User with role ${userRole} cannot perform ${requiredAction}`);
    }
};
