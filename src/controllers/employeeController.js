import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { generateCode, objectId } from "../utils/helper.js";
import { differenceInMonths } from "date-fns";
import {
    uploadOnCloudinary,
    destroyOnCloudinary,
} from "../utils/cloudinary.js";

import { Employee } from "../models/employeeModel.js";
import { Team } from "../models/teamModel.js";

export const createData = asyncHandler(async (req, res) => {
    const data = req.body;

    data.companyId = req.user?.companyId;
    data.employeeId = generateCode(5);

    if (!data.supervisor) {
        delete data.supervisor;
    }

    if (req.file?.path) {
        const uploadAvatar = await uploadOnCloudinary(req.file?.path);
        data.avatar = uploadAvatar?.url || "";
    }

    const newEmployee = await Employee.create(data);

    if (!newEmployee) {
        throw new ApiError(400, "Invalid credentials");
    }

    // update team employees
    const updateTeam = await Team.findByIdAndUpdate(
        newEmployee.team,
        { $push: { employees: newEmployee._id } },
        { new: true }
    ).populate("employees");

    if (!updateTeam) {
        throw new ApiError(400, "Invalid team credentials");
    }

    return res
        .status(201)
        .json(
            new ApiResponse(200, newEmployee, "Employee created successfully")
        );
});

export const getActiveData = asyncHandler(async (req, res) => {
    const filters = { companyId: req.user?.companyId, status: 1 };

    const employees = await Employee.find(filters)
        .select("employeeId name avatar email mobile onboardingDate")
        .populate({ path: "designation", select: "name" })
        .populate({ path: "shift", select: "name" })
        .populate({ path: "provationPeriod", select: "name month" })
        .populate({ path: "supervisor", select: "name avatar" })
        .lean();

    return res
        .status(201)
        .json(
            new ApiResponse(200, employees, "Employee retrieved successfully")
        );
});

export const getInactiveData = asyncHandler(async (req, res) => {
    const filters = { companyId: req.user?.companyId, status: 0 };

    const employees = await Employee.find(filters)
        .select("employeeId name avatar email mobile onboardingDate")
        .populate({ path: "designation", select: "name" })
        .populate({ path: "shift", select: "name" })
        .populate({ path: "provationPeriod", select: "name month" })
        .populate({ path: "supervisor", select: "name avatar" })
        .lean();

    return res
        .status(201)
        .json(
            new ApiResponse(200, employees, "Employee retrieved successfully")
        );
});

export const getCountData = asyncHandler(async (req, res) => {
    const companyId = req.user?.companyId || "66bdec36e1877685a60200ac";

    const employees = await Employee.aggregate([
        {
            $match: {
                companyId: { $eq: objectId(companyId) },
            },
        },
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
            },
        },
    ]);

    let active = 0;
    let inactive = 0;

    if (employees) {
        employees.forEach((row) => {
            if (row._id === 1) {
                active = row.count;
            }

            if (row._id === 0) {
                inactive = row.count;
            }
        });
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                200,
                { active, inactive },
                "Employee retrieved successfully"
            )
        );
});

export const getData = asyncHandler(async (req, res) => {
    const filters = { companyId: req.user?.companyId, _id: req.params.id };

    const employee = await Employee.findOne(filters)
        .populate({ path: "employeeType", select: "name" })
        .populate({ path: "team", select: "name" })
        .populate({ path: "provationPeriod", select: "name month" })
        .populate({ path: "designation", select: "name" })
        .populate({ path: "employeeLevel", select: "name" })
        .populate({ path: "shift", select: "name" })
        .populate({ path: "offboardingType", select: "name" })
        .populate({ path: "reason", select: "name" })
        .populate({ path: "supervisor", select: "name avatar" })
        .lean();

    if (!employee) {
        throw new ApiError(404, "Employee not found");
    }

    return res
        .status(201)
        .json(
            new ApiResponse(200, employee, "Employee retrieved successfully")
        );
});

export const updateData = asyncHandler(async (req, res) => {
    const filters = { companyId: req.user?.companyId, _id: req.params.id };

    const employeeInfo = await Employee.findOne(filters).lean();

    if (!employeeInfo) {
        throw new ApiError(404, "Employee not found");
    }

    const data = req.body;

    if (req.file && req.file?.path) {
        const uploadAvatar = await uploadOnCloudinary(req.file?.path);
        data.avatar = uploadAvatar?.url || "";

        if (employeeInfo && employeeInfo.avatar) {
            await destroyOnCloudinary(employeeInfo.avatar);
        }
    }

    const employee = await Employee.findOneAndUpdate(filters, data, {
        new: true,
    });

    return res
        .status(201)
        .json(new ApiResponse(200, employee, "Employee updated successfully"));
});

export const updateOffboarding = asyncHandler(async (req, res) => {
    const filters = { companyId: req.user?.companyId, _id: req.params.id };

    const employeeInfo = await Employee.findOne(filters).lean();

    if (!employeeInfo) {
        throw new ApiError(404, "Employee not found");
    }

    const data = req.body;

    if (!data?.offboardingDate) {
        throw new ApiError(400, "Offboardin date is required");
    }

    if (!data?.offboardingType) {
        throw new ApiError(400, "Offboardin type is required");
    }

    if (!data?.reason) {
        throw new ApiError(400, "Reason is required");
    }

    data.status = 0;

    const employee = await Employee.findByIdAndUpdate(employeeInfo._id, data, {
        new: true,
    });

    return res
        .status(201)
        .json(new ApiResponse(200, employee, "Employee updated successfully"));
});

export const deleteData = asyncHandler(async (req, res) => {
    const filters = { companyId: req.user?.companyId, _id: req.params.id };

    const employeeInfo = await Employee.findOne(filters);

    if (!employeeInfo) {
        throw new ApiError(404, "Employee not found");
    }

    const employee = await Employee.findByIdAndUpdate(
        employeeInfo._id,
        { status: employeeInfo.status === 0 ? 1 : 0 },
        { new: true }
    );

    return res
        .status(201)
        .json(
            new ApiResponse(
                200,
                employee,
                "Employee status update successfully"
            )
        );
});

export const getSelectList = asyncHandler(async (req, res) => {
    const filters = { companyId: req.user?.companyId, status: 1 };

    const employees = await Employee.find(filters)
        .select("name email avatar")
        .populate({ path: "team", select: "name" });

    return res
        .status(201)
        .json(
            new ApiResponse(200, employees, "Employee retrieved successfully")
        );
});

export const getEmployeeRatio = asyncHandler(async (req, res) => {
    const data = await calculateEmployeeRatio(req);

    return res
        .status(201)
        .json(
            new ApiResponse(200, data, "Employee ratio retrieved successfully")
        );
});

async function calculateEmployeeRatio(req) {
    const today = new Date();

    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);

    const employeeList = await Employee.find({ companyId: req.user?.companyId })
        .select("name onboardingDate offboardingDate status")
        .populate({ path: "provationPeriod", select: "name month" });

    const totalEmployees = employeeList.length;

    // Fetch the total number of employees at the start date (previous)
    const totalEmployeesPreviously = await Employee.countDocuments({
        onboardingDate: { $lt: startDate },
    });

    const activeEmployees = employeeList.filter(
        (row) => row.status === 1
    ).length;

    const inactiveEmployees = employeeList.filter(
        (row) => row.status === 0
    ).length;

    const newEmployeesList = [];
    employeeList.map((row) => {
        const diffInMonth = differenceInMonths(
            new Date(),
            new Date(row.onboardingDate)
        );

        if (diffInMonth <= row.provationPeriod.month) {
            newEmployeesList.push(row);
        }
    });

    const newEmployees = newEmployeesList.length;

    const employeeRatio =
        totalEmployeesPreviously > 0
            ? ((totalEmployees - totalEmployeesPreviously) /
                  totalEmployeesPreviously) *
              100
            : 0;
    const activeEmployeeRatio =
        totalEmployees > 0 ? (activeEmployees / totalEmployees) * 100 : 0;
    const newEmployeeRatio = (newEmployees / totalEmployees) * 100;
    const inactiveEmployeeRatio = (inactiveEmployees / totalEmployees) * 100;

    const data = {
        employees: totalEmployees,
        employeeRatio: parseFloat(employeeRatio.toFixed(2)),
        activeEmployees: activeEmployees,
        activeEmployeeRatio: parseFloat(activeEmployeeRatio.toFixed(2)),
        inactiveEmployees: inactiveEmployees,
        inactiveEmployeeRatio: parseFloat(inactiveEmployeeRatio.toFixed(2)),
        newEmployees: newEmployees,
        newEmployeeRatio: parseFloat(newEmployeeRatio.toFixed(2)),
    };

    return data;
}
