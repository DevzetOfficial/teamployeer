import { asyncHandler } from "../utilities/asyncHandler.js";
import { ApiResponse } from "../utilities/ApiResponse.js";
import { ApiError } from "../utilities/ApiError.js";
import { objectId, getSegments, ucfirst } from "../utilities/helper.js";
import {
    uploadOnCloudinary,
    destroyOnCloudinary,
} from "../utilities/cloudinary.js";

import { Project } from "../models/projectModel.js";
import { Scrumboard } from "../models/scrumboardModel.js";

export const createData = asyncHandler(async (req, res) => {
    let projectImage;
    if (req.file?.path) {
        projectImage = await uploadOnCloudinary(req.file?.path);
    }

    const data = {
        companyId: req.user?.companyId,
        name: req.body.name,
        client: req.body.client,
        projectManager: req.body.projectManager,
        submissionDate: req.body.submissionDate,
        assignMembers: req.body?.assignMembers || [],
        projectImage: projectImage?.url || "",
        description: req.body?.description || "",
    };

    const newProject = await Project.create(data);

    if (!newProject) {
        throw new ApiError(400, "Invalid credentials");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, newProject, "Project created successfully"));
});

export const getAllData = asyncHandler(async (req, res) => {
    const filters = { companyId: req.user?.companyId };

    const segments = getSegments(req.url);

    if (segments?.[1]) {
        filters.status =
            segments[1] === "onhold" ? "On Hold" : ucfirst(segments[1]);
    }

    const projects = await Project.find(filters)
        .populate({ path: "client", select: "name source avatar" })
        .populate({ path: "projectManager", select: "name avatar" })
        .populate({
            path: "assignMembers",
            select: "name avatar",
            populate: {
                path: "designation",
                model: "Designation",
                select: "name",
            },
        })
        .lean();

    const newProjects = projects.map((row) => {
        return {
            ...row,
            progress: 0,
        };
    });

    return res
        .status(201)
        .json(
            new ApiResponse(200, newProjects, "Project retrieved successfully")
        );
});

export const getCountData = asyncHandler(async (req, res) => {
    const projects = await Project.aggregate([
        {
            $match: {
                companyId: { $eq: objectId(req.user?.companyId) },
            },
        },
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
            },
        },
    ]);

    const dataCount = {
        ongoing: 0,
        onhold: 0,
        completed: 0,
        canceled: 0,
    };

    if (projects) {
        projects.forEach((row) => {
            if (row._id === "Ongoing") {
                dataCount.ongoing = row.count;
            }

            if (row._id === "On Hold") {
                dataCount.onhold = row.count;
            }

            if (row._id === "Completed") {
                dataCount.completed = row.count;
            }

            if (row._id === "Canceled") {
                dataCount.canceled = row.count;
            }
        });
    }

    return res
        .status(201)
        .json(
            new ApiResponse(200, dataCount, "Project retrieved successfully")
        );
});

export const getData = asyncHandler(async (req, res) => {
    const companyId = req.user?.companyId;
    const projectId = req.params.id;

    const filters = { companyId: companyId, _id: projectId };

    const project = await Project.findOne(filters)
        .populate({ path: "client", select: "name source avatar" })
        .populate({ path: "projectManager", select: "name avatar" })
        .populate({
            path: "assignMembers",
            select: "name avatar",
            populate: {
                path: "designation",
                model: "Designation",
                select: "name",
            },
        })
        .lean();

    if (!project) {
        throw new ApiError(400, "Project not found");
    }

    const scrumboards = Scrumboard.find({ project: project._id });

    if (!scrumboards) {
        console.log(scrumboards);
    }

    return res
        .status(200)
        .json(new ApiResponse(200, project, "Project retrieved successfully"));
});

export const updateData = asyncHandler(async (req, res) => {
    const filters = { companyId: req.user?.companyId, _id: req.params.id };

    const projectInfo = await Project.findOne(filters).lean();

    if (!projectInfo) {
        throw new ApiError(400, "Project not found");
    }

    const data = req.body;

    if (req.file?.path) {
        const uploadProjectImage = await uploadOnCloudinary(req.file?.path);
        data.projectImage = uploadProjectImage?.url || "";

        if (projectInfo.projectImage) {
            await destroyOnCloudinary(projectInfo.projectImage);
        }
    } else {
        if (req.body?.projectImage === "") {
            delete req.body.projectImage;
        }
    }

    const updateProject = await Project.findByIdAndUpdate(
        projectInfo._id,
        data,
        {
            new: true,
        }
    );

    return res
        .status(200)
        .json(
            new ApiResponse(200, updateProject, "Project updated successfully")
        );
});

export const deleteData = asyncHandler(async (req, res) => {
    const filters = { companyId: req.user?.companyId, _id: req.params.id };

    const project = await Project.findOne(filters);

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    await Project.findByIdAndDelete(project._id);

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Project delete successfully"));
});
