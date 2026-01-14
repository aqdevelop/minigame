import { APP_VERSION } from '../constants/version';
import './VersionBadge.css';

export const VersionBadge = () => {
  return (
    <div className="version-badge">
      v{APP_VERSION}
    </div>
  );
};
