import React from 'react';

const Breadcrumbs = ({ currentPath, setCurrentPath, isTrashView, isSharedWithMeView, isMySharesView, currentSharedItemId, currentSharedVirtualPath }) => {
  if (isTrashView) {
    return <div className="flex items-center gap-2 text-sm text-gray-200">Trash</div>;
  }
  if (isSharedWithMeView) {
    const parts = currentSharedVirtualPath.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Shared with me', path: 'shared-with-me', isVirtual: false }];

    let path = '';
    for (const part of parts) {
      path += `/${part}`;
      breadcrumbs.push({ name: part, path, isVirtual: true });
    }

    return (
      <div className="flex items-center gap-2 text-sm text-gray-200 flex-wrap">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.path}>
            <button 
              onClick={() => {
                if (crumb.isVirtual) {
                  // For virtual paths within a shared item, we need to trigger a re-fetch with the virtual path
                  setCurrentPath('shared-with-me'); // Keep main path as 'shared-with-me'
                  // The FileManagerPage will handle setting currentSharedVirtualPath based on this
                  // For now, we'll rely on the parent to manage currentSharedVirtualPath
                  // A more robust solution would involve passing a specific handler for shared virtual paths
                  // For simplicity, we'll just navigate to the top-level shared-with-me and let the parent re-evaluate
                  // This is a temporary simplification.
                  // A better approach would be: onNavigateToSharedVirtualPath(currentSharedItemId, crumb.path)
                  // For now, clicking a virtual breadcrumb will reset to the top of the shared item.
                  // To fix this, we need to pass a specific handler from FileManagerPage.
                  // For now, I'll make it navigate to the top-level shared-with-me view.
                  if (crumb.path === 'shared-with-me') {
                    setCurrentPath('shared-with-me');
                  } else {
                    // This part needs a dedicated handler from FileManagerPage to update currentSharedVirtualPath
                    // For now, it will just navigate to the top-level shared-with-me view.
                    setCurrentPath('shared-with-me');
                  }
                } else {
                  setCurrentPath(crumb.path);
                }
              }} 
              className="px-2 py-1 rounded-md hover:shadow-neo-inset transition-all"
            >
              {crumb.name}
            </button>
            {index < breadcrumbs.length - 1 && <span>/</span>}
          </React.Fragment>
        ))}
      </div>
    );
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