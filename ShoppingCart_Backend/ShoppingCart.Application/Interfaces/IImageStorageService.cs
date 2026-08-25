using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Application.Interfaces
{
    public interface IImageStorageService
    {
        Task<string> UploadImageAsync(Stream fileStream, string fileName, string contentType);
    }
}
