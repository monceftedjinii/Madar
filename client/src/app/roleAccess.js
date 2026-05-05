const OLD_RH_ROLES = new Set(["RH_SIMPLE", "RH_AGENT", "RH_SENIOR", "GRH"])
const RH_EMPLOYEE_ROLES = new Set(["RH", "RH_CONGE", "RH_FORMATION", "DRH"])

export function getRoleContext(user = {}) {
  const role = user.role || ""
  const service = user.service || ""
  const employeeRole = user.employee_role || user.employeeRole || ""
  const isRhService = service === "RH"

  // employee_role is the source of truth for the new schema.
  // Old role field is only used as fallback when employee_role is absent.
  const isDrh = employeeRole === "DRH" || role === "GRH"
  const isRhConges = !isDrh && (employeeRole === "RH_CONGE" || (!RH_EMPLOYEE_ROLES.has(employeeRole) && role === "RH_SIMPLE"))
  const isRhFormation = !isDrh && (employeeRole === "RH_FORMATION" || (!RH_EMPLOYEE_ROLES.has(employeeRole) && role === "RH_AGENT"))
  const isRhBasic = !isDrh && !isRhConges && !isRhFormation && (employeeRole === "RH" || (isRhService && !OLD_RH_ROLES.has(role)))
  const isRh = isDrh || isRhConges || isRhFormation || isRhBasic || OLD_RH_ROLES.has(role)

  // Chef must not bleed into RH users even if User.role was set to CHEF inconsistently
  const isChef = !isRh && (employeeRole === "CHEF" || role === "CHEF")
  const isEmployee = !isRh && !isChef && (employeeRole === "EMPLOYEE" || role === "EMPLOYEE")

  const effectiveRole = employeeRole || role

  return {
    role,
    service,
    employeeRole,
    effectiveRole,
    isEmployee,
    isChef,
    isRh,
    isRhBasic,
    isRhService,
    isRhConges,
    isRhFormation,
    isDrh,
    canViewRhCommon: isRh,
    canViewRhLeaves: isRhConges || isDrh,
    canViewRhAbsences: isRhConges || isDrh,
    canViewRhFormations: isRhFormation || isDrh,
    canManageEmployees: isDrh,
    canManageServices: isDrh,
    canValidateDocuments: isDrh,
  }
}

export function getRoleLabel(user = {}) {
  const context = getRoleContext(user)

  if (context.isDrh) return "DRH"
  if (context.isRhFormation) return "RH Formation"
  if (context.isRhConges) return "RH Congé"
  if (context.isRhBasic) return "RH"
  if (context.isChef) return "Chef"
  if (context.isEmployee) return "Employé"

  return context.effectiveRole || context.role || "Utilisateur"
}
