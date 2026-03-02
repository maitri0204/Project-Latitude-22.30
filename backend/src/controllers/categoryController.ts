import { Request, Response } from "express";
import Category from "../models/Category";

// GET /api/lms/categories
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ categories });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/lms/categories
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ message: "Category name is required" });
      return;
    }
    const existing = await Category.findOne({ name: name.trim() });
    if (existing) {
      res.status(400).json({ message: "Category already exists" });
      return;
    }
    const category = await Category.create({ name: name.trim(), subCategories: [] });
    res.status(201).json({ category, message: "Category created" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/lms/categories/:id  — add a sub-category
export const addSubCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { subCategory } = req.body;
    if (!subCategory?.trim()) {
      res.status(400).json({ message: "Sub-category name is required" });
      return;
    }
    const category = await Category.findById(req.params.id);
    if (!category) {
      res.status(404).json({ message: "Category not found" });
      return;
    }
    if (category.subCategories.includes(subCategory.trim())) {
      res.status(400).json({ message: "Sub-category already exists" });
      return;
    }
    category.subCategories.push(subCategory.trim());
    await category.save();
    res.json({ category, message: "Sub-category added" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/lms/categories/:id
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: "Category deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/lms/categories/:id/sub/:subCategory
export const deleteSubCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      res.status(404).json({ message: "Category not found" });
      return;
    }
    category.subCategories = category.subCategories.filter(
      (s) => s !== decodeURIComponent(String(req.params.subCategory))
    );
    await category.save();
    res.json({ category, message: "Sub-category removed" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
