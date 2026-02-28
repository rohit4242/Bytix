import { Position, Role } from "../generated/prisma";

/**
 * Thrown when a user attempts to access or modify a resource they do not own or have permission for.
 */
export class ForbiddenError extends Error {
    public status = 403;
    constructor(message = "Forbidden") {
        super(message);
        this.name = "ForbiddenError";
    }
}

/**
 * Validates whether the given user has permission to access the given position.
 * - ADMIN: Access to all positions
 * - AGENT: Access to positions owned by their assigned customers
 * - CUSTOMER: Access to their own positions
 *
 * @throws {ForbiddenError} if the user does not have permission
 */
export function assertPositionOwnership(
    user: { id: string; role: string; agentId?: string | null },
    position: Pick<Position, "userId"> & { user?: { agentId?: string | null } }
) {
    if (user.role === Role.ADMIN) {
        return; // Admins can access everything
    }

    if (user.role === Role.AGENT) {
        // Agents can access own positions + their customers' positions
        // This requires the position to be loaded with `include: { user: true }`
        if (position.userId === user.id) return;
        if (position.user && position.user.agentId === user.id) return;

        throw new ForbiddenError("You do not have permission to access a position owned by another agent's customer");
    }

    // CUSTOMER role
    if (position.userId !== user.id) {
        throw new ForbiddenError("You can only access your own positions");
    }
}
