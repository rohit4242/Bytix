"use client"

import { DataTable } from "./data-table"
import { getColumns, UserColumn } from "./columns"

interface UsersClientProps {
    data: UserColumn[]
    agents: { id: string; name: string | null; email: string }[]
}

export function UsersClient({ data, agents }: UsersClientProps) {
    const columns = getColumns({ agents })

    return (
        <DataTable
            columns={columns}
            data={data}
            searchKey="name"
        />
    )
}
