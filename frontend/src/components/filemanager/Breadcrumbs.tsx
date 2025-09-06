import React from 'react';

const Breadcrumbs = ({ currentPath, setCurrentPath, isTrashView, isSharedWithMeView, isMySharesView }) => {
  if (isTrashView) {
    return <div className="flex items-center gap-2 text-sm text-gray-200">Trash</div>;
  }
  if (isSharedWithMeView) {
    return <div className="flex items-center gap-2 text-sm text-gray-200">Shared with me</div>;
  }
  if (isMySharesView) {
    return <div className="flex items-center gap-2 text-sm text-gray-200">My Shares</div>;
  }

  const parts = currentPath.split('/').filter(Boolean);
  const breadcrumbs = [{ name: 'root', path: '/' }];

  let path = '';
  for (const part of parts) {
    path += `/${part}`;
    breadcrumbs.push({ name: part, path });
  }

  return (
    <div className="flex items-center gap-2 text-sm text-gray-200 flex-wrap">
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.path}>
          <button onClick={() => setCurrentPath(crumb.path)} className="px-2 py-1 rounded-md hover:shadow-neo-inset transition-all">{crumb.name}</button>
          {index < breadcrumbs.length - 1 && <span>/</span>}
        </React.Fragment>
      ))}
    </div>
  );
};

export default Breadcrumbs;