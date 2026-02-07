import React, { useState, useEffect } from 'react';
import { IoClose, IoPersonRemove, IoAdd, IoTrash, IoPencil } from 'react-icons/io5';
import Button from '../../common/Button';
import Avatar from '../../common/Avatar';
import Input from '../../common/Input';
import { updateGroupDetails, updateGroupMembers, deleteGroup } from '../../../api/chatApi'; // Import new functions
import { searchUsers } from '../../../api/userSearchApi'; // Import user search directly

const GroupDetailsModal = ({ group, onClose, onUpdate, onDelete }) => {
  const [activeTab, setActiveTab] = useState('members'); // members, settings
  const [groupName, setGroupName] = useState(group.name);
  const [groupIcon, setGroupIcon] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Members Management
  const [members, setMembers] = useState(group.members_list || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]); // Implement search logic if needed or re-use CreateGroupModal logic

  const isOwner = group.admin === group.current_user_id; // Need to pass current user ID or context

  const handleUpdateDetails = async () => {
    setLoading(true);
    try {
      const updatedGroup = await updateGroupDetails(group.id, groupName, groupIcon);
      onUpdate(updatedGroup);
      setIsEditing(false);
    } catch (err) {
      setError("Failed to update group details.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm("Are you sure you want to delete this group? This action cannot be undone.")) return;
    setLoading(true);
    try {
      await deleteGroup(group.id);
      onDelete(group.id);
      onClose();
    } catch (err) {
      setError("Failed to delete group.");
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Remove this member?")) return;
    try {
      await updateGroupMembers(group.id, [], [memberId]);
      setMembers(members.filter(m => m.id !== memberId));
      onUpdate({ ...group, members_count: members.length - 1 });
    } catch (err) {
      console.error("Failed to remove member", err);
    }
  };

  // Placeholder for adding members - requires search logic
  const handleAddMember = async (user) => {
    try {
      await updateGroupMembers(group.id, [user.id], []);
      setMembers([...members, user]);
      // Also update the parent state if possible
      onUpdate({ ...group, members_count: members.length + 1 });
      setSearchQuery('');
      setSearchResults([]);
    } catch (e) { console.error("Add failed", e) }
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim().length > 1) {
      try {
        const results = await searchUsers(query);
        // Filter out existing members
        const newResults = results.filter(u => !members.find(m => m.id === u.id));
        setSearchResults(newResults);
      } catch (err) {
        console.error("Search failed", err);
      }
    } else {
      setSearchResults([]);
    }
  };


  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-glass-card border border-glass-border rounded-xl w-full max-w-md p-6 relative flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-text-secondary hover:text-text-primary">
          <IoClose size={24} />
        </button>

        <h2 className="text-xl font-bold text-text-primary mb-4">Group Details</h2>

        {/* Tabs */}
        <div className="flex border-b border-border mb-4">
          <button
            className={`flex-1 pb-2 font-medium ${activeTab === 'members' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary'}`}
            onClick={() => setActiveTab('members')}
          >
            Members ({members.length})
          </button>
          <button
            className={`flex-1 pb-2 font-medium ${activeTab === 'settings' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary'}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'members' && (
            <div className="space-y-3">
              {/* List Members */}
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar src={member.profile?.profile_picture} size="sm" />
                    <div>
                      <p className="text-text-primary font-medium">{member.username}</p>
                      {member.id === group.admin && <span className="text-xs text-primary">Admin</span>}
                    </div>
                  </div>
                  {isOwner && member.id !== group.admin && (
                    <button onClick={() => handleRemoveMember(member.id)} className="text-red-500 hover:bg-red-500/10 p-1 rounded">
                      <IoPersonRemove />
                    </button>
                  )}
                </div>
              ))}

              {/* Add Member UI */}
              {isOwner && (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-sm font-semibold mb-2">Add Members</p>
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={handleSearch}
                  />
                  {searchResults.length > 0 && (
                    <div className="mt-2 bg-black/20 rounded-lg max-h-40 overflow-y-auto">
                      {searchResults.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-2 hover:bg-white/10 cursor-pointer" onClick={() => handleAddMember(user)}>
                          <div className="flex items-center space-x-2">
                            <Avatar src={user.profile?.profile_picture} size="xs" />
                            <span className="text-sm">{user.username}</span>
                          </div>
                          <IoAdd className="text-primary" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center mb-4">
                <div className="relative group cursor-pointer">
                  <Avatar src={groupIcon ? URL.createObjectURL(groupIcon) : group.icon} size="xl" />
                  {isEditing && (
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition">
                      <IoPencil className="text-white" />
                      <input type="file" className="hidden" onChange={(e) => setGroupIcon(e.target.files[0])} accept="image/*" />
                    </label>
                  )}
                </div>
              </div>

              <Input
                label="Group Name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                disabled={!isEditing}
              />

              <div className="flex space-x-3 mt-6">
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} variant="secondary" className="w-full">
                    Edit Details
                  </Button>
                ) : (
                  <div className="flex w-full space-x-2">
                    <Button onClick={() => setIsEditing(false)} variant="outline" className="flex-1">Cancel</Button>
                    <Button onClick={handleUpdateDetails} isLoading={loading} className="flex-1">Save</Button>
                  </div>
                )}
              </div>

              <div className="border-t border-border my-4 pt-4">
                <Button onClick={handleDeleteGroup} variant="danger" className="w-full flex items-center justify-center" isLoading={loading}>
                  <IoTrash className="mr-2" /> Delete Group
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupDetailsModal;
