"use client";

import { EmployeeDirectoryAdmin } from "@/components/employee-directory-admin";
import { PageHeader } from "@/components/page-header";

export default function EmployeeDirectoryPage() {
  return <><PageHeader title="Employee directory" description="Maintain the names available to employees in the public transport request form." /><EmployeeDirectoryAdmin /></>;
}
