interface AvatarGroupProps {
  avatars: string[];
}

const AvatarGroup = ({ avatars }: AvatarGroupProps) => {
  return (
    <div className="flex -space-x-3">
      {avatars.map((avatar, index) => (
        <img
          key={index}
          src={avatar}
          alt="user"
          className="h-10 w-10 rounded-full border-2 border-white object-cover"
        />
      ))}
    </div>
  );
};

export default AvatarGroup;