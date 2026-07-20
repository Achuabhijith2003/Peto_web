interface SectionTitleProps {
  title: string;
  subtitle?: string;
}

const SectionTitle = ({ title, subtitle }: SectionTitleProps) => {
  return (
    <div className="mb-10 flex items-end justify-between">
      <div>
        <h2 className="text-4xl font-bold text-slate-900">
          {title}
        </h2>

        {subtitle && (
          <p className="mt-2 text-slate-500">
            {subtitle}
          </p>
        )}
      </div>

      <button className="rounded-lg border px-5 py-2 hover:bg-slate-100">
        View All
      </button>
    </div>
  );
};

export default SectionTitle;