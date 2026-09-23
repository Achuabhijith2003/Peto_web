import { Request, Response } from "express";
import {
  createPetService,
  getPetByIdService,
  updatePetService,
  deletePetService,
  updatePetVisibilityService,
  getUserPetsService,
  getMyPetsService,
  getMyPendingPetInvitesService,
  addPetMediaService,
  deletePetMediaService,
  invitePetParentService,
  respondPetParentInviteService,
  removePetParentService,
  getPetPostsService,
  searchTaggablePetsService,
} from "./pet.service";

export async function createPetHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const pet = await createPetService(userId, req.body);
    res.status(201).json({ success: true, data: pet });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message || "Failed to create pet" });
  }
}

export async function getPetHandler(req: Request, res: Response): Promise<void> {
  try {
    const petId = req.params.id as string;
    const requesterId = (req as any).user?.id || null;

    const pet = await getPetByIdService(petId, requesterId);
    res.json({ success: true, data: pet });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message || "Pet not found" });
  }
}

export async function updatePetHandler(req: Request, res: Response): Promise<void> {
  try {
    const petId = req.params.id as string;
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const updated = await updatePetService(petId, userId, req.body);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message || "Failed to update pet" });
  }
}

export async function deletePetHandler(req: Request, res: Response): Promise<void> {
  try {
    const petId = req.params.id as string;
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    await deletePetService(petId, userId);
    res.json({ success: true, message: "Pet deleted successfully" });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message || "Failed to delete pet" });
  }
}

export async function updatePetVisibilityHandler(req: Request, res: Response): Promise<void> {
  try {
    const petId = req.params.id as string;
    const userId = (req as any).user?.id;
    const { visibility } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const updated = await updatePetVisibilityService(petId, userId, visibility);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message || "Failed to update visibility" });
  }
}

export async function getUserPetsHandler(req: Request, res: Response): Promise<void> {
  try {
    const targetUserId = String(req.params.userId || req.params.id);
    const requesterId = (req as any).user?.id || null;

    const pets = await getUserPetsService(targetUserId, requesterId);
    res.json({ success: true, data: pets });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message || "Failed to fetch user pets" });
  }
}

export async function getMyPetsHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const pets = await getMyPetsService(userId);
    res.json({ success: true, data: pets });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message || "Failed to fetch your pets" });
  }
}

export async function addPetMediaHandler(req: Request, res: Response): Promise<void> {
  try {
    const petId = req.params.id as string;
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const item = await addPetMediaService(petId, userId, req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message || "Failed to add pet media" });
  }
}

export async function deletePetMediaHandler(req: Request, res: Response): Promise<void> {
  try {
    const petId = req.params.id as string;
    const mediaId = req.params.mediaId as string;
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    await deletePetMediaService(petId, mediaId, userId);
    res.json({ success: true, message: "Pet media removed successfully" });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message || "Failed to remove pet media" });
  }
}

export async function invitePetParentHandler(req: Request, res: Response): Promise<void> {
  try {
    const petId = req.params.id as string;
    const userId = (req as any).user?.id;
    const { invitee, relationship, permissions } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const result = await invitePetParentService(petId, userId, invitee, relationship, permissions);
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message || "Failed to invite pet parent" });
  }
}

export async function getMyPendingPetInvitesHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const invites = await getMyPendingPetInvitesService(userId);
    res.json({ success: true, data: invites });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message || "Failed to fetch pending pet invites" });
  }
}

export async function respondPetParentInviteHandler(req: Request, res: Response): Promise<void> {
  try {
    const petId = req.params.id as string;
    const inviteId = (req.params.inviteId || req.body.inviteId) as string;
    const userId = (req as any).user?.id;
    const { accept } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const targetId = inviteId || petId;
    const result = await respondPetParentInviteService(targetId, userId, Boolean(accept));
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message || "Failed to respond to invite" });
  }
}

export async function removePetParentHandler(req: Request, res: Response): Promise<void> {
  try {
    const petId = req.params.id as string;
    const parentUserId = req.params.parentUserId as string;
    const callerId = (req as any).user?.id;

    if (!callerId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    await removePetParentService(petId, parentUserId, callerId);
    res.json({ success: true, message: "Pet parent relationship removed successfully" });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message || "Failed to remove pet parent" });
  }
}

export async function getPetPostsHandler(req: Request, res: Response): Promise<void> {
  try {
    const petId = req.params.id as string;
    const requesterId = (req as any).user?.id || null;
    const page = parseInt(String(req.query.page || "1"), 10);
    const limit = parseInt(String(req.query.limit || "10"), 10);

    const result = await getPetPostsService(petId, requesterId, page, limit);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message || "Failed to fetch pet posts" });
  }
}

export async function searchTaggablePetsHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const query = (req.query.q as string) || "";
    const pets = await searchTaggablePetsService(userId, query);
    res.json({ success: true, data: pets });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message || "Failed to search taggable pets" });
  }
}
