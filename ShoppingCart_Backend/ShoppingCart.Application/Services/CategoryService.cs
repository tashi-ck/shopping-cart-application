using ShoppingCart.Application.Interfaces;
using ShoppingCart.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ShoppingCart.Application.DTOs.CategoryDtos;

namespace ShoppingCart.Application.Services
{
    public class CategoryService : ICategoryService
    {
        private readonly ICategoryRepository _categoryRepository;
        public CategoryService(ICategoryRepository categoryRepository) => _categoryRepository = categoryRepository;

        public async Task<IEnumerable<CategoryDto>> GetAllCategoriesAsync()
        {
            var categories = await _categoryRepository.GetAllAsync();
            return categories.Select(MapToDto);
        }

        public async Task<CategoryDto?> GetCategoryAsync(int categoryId)
        {
            var category = await _categoryRepository.GetByIdAsync(categoryId);
            return category is null ? null : MapToDto(category);
        }

        public async Task<CategoryDto> CreateCategoryAsync(CreateCategoryDto dto)
        {
            var category = new Category { Name = dto.Name, Description = dto.Description };
            var created = await _categoryRepository.CreateAsync(category);
            return MapToDto(created);
        }

        public Task<bool> UpdateCategoryAsync(int categoryId, UpdateCategoryDto dto)
        {
            var category = new Category { CategoryId = categoryId, Name = dto.Name, Description = dto.Description };
            return _categoryRepository.UpdateAsync(category);
        }

        public Task<bool> DeleteCategoryAsync(int categoryId) =>
            _categoryRepository.DeleteAsync(categoryId);

        private static CategoryDto MapToDto(Category c) => new(c.CategoryId, c.Name, c.Description);
    }
}
