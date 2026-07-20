interface ImageGridProps {
  images: string[];
}

const ImageGrid = ({ images }: ImageGridProps) => {
  if (images.length === 1) {
    return (
      <img
        src={images[0]}
        alt="Post"
        className="max-h-[520px] w-full object-cover"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1">
      {images.map((image, index) => (
        <img
          key={index}
          src={image}
          alt={`Post ${index + 1}`}
          className="h-64 w-full object-cover"
        />
      ))}
    </div>
  );
};

export default ImageGrid;