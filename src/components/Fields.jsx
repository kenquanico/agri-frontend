import { useState } from 'react';
import { Plus, Trash2, Edit2, Users, Activity } from 'lucide-react';

export default function Fields() {
  const [fields, setFields] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showFarmerModal, setShowFarmerModal] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [activeMonitoringFieldId, setActiveMonitoringFieldId] = useState(null);
  const [formData, setFormData] = useState({
    fieldName: '',
    area: '',
    crops: ''
  });
  const [farmerInput, setFarmerInput] = useState('');
  const [editingId, setEditingId] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingId !== null) {
      // Edit existing field
      setFields(fields.map(field =>
        field.id === editingId ? { ...field, ...formData } : field
      ));
      setEditingId(null);
    } else {
      // Add new field
      const newField = {
        ...formData,
        id: Date.now(),
        farmers: []
      };
      setFields([...fields, newField]);
    }

    // Reset form
    setFormData({ fieldName: '', area: '', crops: '' });
    setShowForm(false);
  };

  const handleEdit = (field) => {
    setFormData({
      fieldName: field.fieldName,
      area: field.area,
      crops: field.crops
    });
    setEditingId(field.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    // If deleting the actively monitored field, stop monitoring
    if (activeMonitoringFieldId === id) {
      setActiveMonitoringFieldId(null);
    }
    setFields(fields.filter(field => field.id !== id));
  };

  const handleCancel = () => {
    setFormData({ fieldName: '', area: '', crops: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const openFarmerModal = (fieldId) => {
    setSelectedFieldId(fieldId);
    setShowFarmerModal(true);
  };

  const handleAddFarmer = () => {
    if (farmerInput.trim() && selectedFieldId) {
      setFields(fields.map(field => {
        if (field.id === selectedFieldId) {
          return {
            ...field,
            farmers: [...field.farmers, farmerInput.trim()]
          };
        }
        return field;
      }));
      setFarmerInput('');
    }
  };

  const handleRemoveFarmer = (fieldId, farmerIndex) => {
    setFields(fields.map(field => {
      if (field.id === fieldId) {
        return {
          ...field,
          farmers: field.farmers.filter((_, index) => index !== farmerIndex)
        };
      }
      return field;
    }));
  };

  const closeFarmerModal = () => {
    setShowFarmerModal(false);
    setSelectedFieldId(null);
    setFarmerInput('');
  };

  const handleStartMonitoring = (fieldId) => {
    const field = fields.find(f => f.id === fieldId);
    
    if (field.farmers.length === 0) {
      alert('Please assign at least one farmer before starting monitoring.');
      return;
    }

    // If another field is being monitored, show warning
    if (activeMonitoringFieldId !== null && activeMonitoringFieldId !== fieldId) {
      const currentField = fields.find(f => f.id === activeMonitoringFieldId);
      const confirmSwitch = window.confirm(
        `The monitoring machine is currently monitoring "${currentField?.fieldName}". ` +
        `Do you want to switch monitoring to "${field.fieldName}"?`
      );
      
      if (!confirmSwitch) {
        return;
      }
    }

    // Set this field as the active monitoring field
    setActiveMonitoringFieldId(fieldId);
    alert(`Monitoring started for ${field.fieldName}!`);
  };

  const handleStopMonitoring = (fieldId) => {
    setActiveMonitoringFieldId(null);
  };

  const getSelectedField = () => {
    return fields.find(f => f.id === selectedFieldId);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Fields</h1>
              <p className="text-gray-600 mt-1">Manage your agricultural fields and assign farmers</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus size={20} />
              Add Field
            </button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? 'Edit Field' : 'Add New Field'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Field Name
                </label>
                <input
                  type="text"
                  name="fieldName"
                  value={formData.fieldName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Unique Name of Field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Area
                </label>
                <input
                  type="text"
                  name="area"
                  value={formData.area}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="SQM or Hectare of Field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Crops
                </label>
                <input
                  type="text"
                  name="crops"
                  value={formData.crops}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Crops Total"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {editingId ? 'Update Field' : 'Add Field'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Fields List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Field Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Area
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Crops
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Farmers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fields.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      No fields added yet. Click "Add Field" to get started.
                    </td>
                  </tr>
                ) : (
                  fields.map((field) => (
                    <tr key={field.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {field.fieldName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {field.area}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {field.crops}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => openFarmerModal(field.id)}
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <Users size={16} />
                          {field.farmers.length > 0
                            ? `${field.farmers.length} farmer(s)`
                            : 'Assign farmers'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {activeMonitoringFieldId === field.id ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                            <Activity size={14} />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {activeMonitoringFieldId !== field.id ? (
                            <button
                              onClick={() => handleStartMonitoring(field.id)}
                              className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Start Monitoring
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStopMonitoring(field.id)}
                              className="px-3 py-1 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                            >
                              Stop Monitoring
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(field)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(field.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        {fields.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Total Fields: {fields.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">
                Active Monitoring: {activeMonitoringFieldId !== null ? 1 : 0}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">
                Total Farmers: {fields.reduce((sum, f) => sum + f.farmers.length, 0)}
              </p>
            </div>
          </div>
        )}

        {/* Farmer Assignment Modal */}
        {showFarmerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">
                Assign Farmers to {getSelectedField()?.fieldName}
              </h2>

              {/* Add Farmer Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Farmer Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={farmerInput}
                    onChange={(e) => setFarmerInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddFarmer()}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter farmer name"
                  />
                  <button
                    onClick={handleAddFarmer}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Farmers List */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Assigned Farmers ({getSelectedField()?.farmers.length || 0})
                </h3>
                {getSelectedField()?.farmers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No farmers assigned yet
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {getSelectedField()?.farmers.map((farmer, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <span className="text-sm text-gray-700">{farmer}</span>
                        <button
                          onClick={() => handleRemoveFarmer(selectedFieldId, index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end">
                <button
                  onClick={closeFarmerModal}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}