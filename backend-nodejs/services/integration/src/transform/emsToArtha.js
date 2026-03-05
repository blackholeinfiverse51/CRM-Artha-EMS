exports.mapEmployeeToArtha = function mapEmployeeToArtha(emsEmp) {
  return {
    external_id: emsEmp.id || emsEmp.employee_id,
    employee_id: emsEmp.employee_id,
    first_name: emsEmp.first_name,
    last_name: emsEmp.last_name,
    email: emsEmp.email,
    department: emsEmp.department || null,
    role: emsEmp.role || null,
    cost_center: emsEmp.cost_center || null,
    active: true,
  };
};
